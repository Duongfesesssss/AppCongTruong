import PrimeVue from "primevue/config";
import ToastService from "primevue/toastservice";
import ConfirmationService from "primevue/confirmationservice";

// PrimeVue Components
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Textarea from "primevue/textarea";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Dialog from "primevue/dialog";
import Card from "primevue/card";
import FileUpload from "primevue/fileupload";
import Dropdown from "primevue/dropdown";
import MultiSelect from "primevue/multiselect";
import Toast from "primevue/toast";
import ConfirmDialog from "primevue/confirmdialog";
import ProgressSpinner from "primevue/progressspinner";
import Menu from "primevue/menu";
import PanelMenu from "primevue/panelmenu";
import Avatar from "primevue/avatar";
import Tag from "primevue/tag";
import Paginator from "primevue/paginator";
import InputNumber from "primevue/inputnumber";
import Checkbox from "primevue/checkbox";

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(PrimeVue, {
    ripple: true,
    inputStyle: "outlined",
    pt: {
      // Custom pass-through options for styling
      button: {
        root: { class: "font-medium" }
      }
    }
  });

  nuxtApp.vueApp.use(ToastService);
  nuxtApp.vueApp.use(ConfirmationService);

  // Register components globally
  nuxtApp.vueApp.component("PrimeButton", Button);
  nuxtApp.vueApp.component("InputText", InputText);
  nuxtApp.vueApp.component("Textarea", Textarea);
  nuxtApp.vueApp.component("DataTable", DataTable);
  nuxtApp.vueApp.component("Column", Column);
  nuxtApp.vueApp.component("PrimeDialog", Dialog);
  nuxtApp.vueApp.component("Card", Card);
  nuxtApp.vueApp.component("FileUpload", FileUpload);
  nuxtApp.vueApp.component("Dropdown", Dropdown);
  nuxtApp.vueApp.component("MultiSelect", MultiSelect);
  nuxtApp.vueApp.component("PrimeToast", Toast);
  nuxtApp.vueApp.component("ConfirmDialog", ConfirmDialog);
  nuxtApp.vueApp.component("ProgressSpinner", ProgressSpinner);
  nuxtApp.vueApp.component("PrimeMenu", Menu);
  nuxtApp.vueApp.component("PanelMenu", PanelMenu);
  nuxtApp.vueApp.component("Avatar", Avatar);
  nuxtApp.vueApp.component("Tag", Tag);
  nuxtApp.vueApp.component("Paginator", Paginator);
  nuxtApp.vueApp.component("InputNumber", InputNumber);
  nuxtApp.vueApp.component("Checkbox", Checkbox);
});
